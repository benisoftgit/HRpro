"""
Ghana Payroll Calculation Utilities.

Reads statutory rates from PayrollSettings and PAYE bands from PAYETaxBand
so all rates are editable from the Settings UI without code changes.
"""

from decimal import Decimal, ROUND_HALF_UP


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def get_settings():
    """Return the PayrollSettings singleton."""
    from apps.salary.models import PayrollSettings
    return PayrollSettings.get_settings()


def get_paye_bands():
    """Return PAYE bands from DB, falling back to Ghana 2024 defaults if empty."""
    from apps.salary.models import PAYETaxBand
    bands = list(PAYETaxBand.objects.order_by("order"))
    if bands:
        return [(b.annual_limit, b.rate) for b in bands]
    # Fallback hardcoded Ghana 2024 bands
    return [
        (Decimal("4380.00"),   Decimal("0.0000")),
        (Decimal("1320.00"),   Decimal("0.0500")),
        (Decimal("1560.00"),   Decimal("0.1000")),
        (Decimal("38000.00"),  Decimal("0.1750")),
        (Decimal("192000.00"), Decimal("0.2500")),
        (None,                 Decimal("0.3000")),
    ]


def calculate_paye(monthly_taxable_income) -> Decimal:
    """
    Calculate monthly PAYE tax using bands stored in the database.
    Converts monthly income to annual, applies progressive bands, returns monthly tax.
    """
    monthly = _to_decimal(monthly_taxable_income)
    if monthly <= 0:
        return Decimal("0.00")

    annual_income = monthly * 12
    annual_tax = Decimal("0.00")
    remaining = annual_income

    for band_limit, rate in get_paye_bands():
        if remaining <= 0:
            break
        taxable_in_band = min(remaining, band_limit) if band_limit else remaining
        annual_tax += taxable_in_band * _to_decimal(rate)
        remaining -= taxable_in_band

    return (annual_tax / 12).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_ssnit(basic_salary) -> dict:
    """Calculate SSNIT contributions using rates from PayrollSettings."""
    basic = _to_decimal(basic_salary)
    s = get_settings()
    employee = (basic * s.ssnit_employee_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    employer = (basic * s.ssnit_employer_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {
        "employee_contribution": employee,
        "employer_contribution": employer,
        "total": employee + employer,
    }


def calculate_tier2(basic_salary) -> Decimal:
    """Calculate Tier 2 employer contribution using rate from PayrollSettings."""
    basic = _to_decimal(basic_salary)
    s = get_settings()
    return (basic * s.tier2_employer_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_tier3(basic_salary) -> dict:
    """Calculate Tier 3 (Provident Fund) contributions."""
    basic = _to_decimal(basic_salary)
    s = get_settings()
    employee = (basic * s.tier3_employee_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    employer = (basic * s.tier3_employer_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {"employee": employee, "employer": employer}


def calculate_overtime(hourly_rate, hours, multiplier=Decimal("1.5")) -> Decimal:
    rate = _to_decimal(hourly_rate)
    hrs = _to_decimal(hours)
    mult = _to_decimal(multiplier)
    return (rate * hrs * mult).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_monthly_hourly_rate(basic_salary) -> Decimal:
    basic = _to_decimal(basic_salary)
    s = get_settings()
    total_hours = Decimal(str(s.working_days_per_month * s.working_hours_per_day))
    if total_hours <= 0:
        return Decimal("0.0000")
    return (basic / total_hours).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def compute_payslip(
    employee,
    month: int,
    year: int,
    overtime_hours: Decimal = Decimal("0"),
    adjustment: "PayrollRunAdjustment | None" = None,
    calculation_mode: str = "SALARY",
    attendance_records: list | None = None,
) -> dict:
    """
    Compute all payslip figures for an employee for a given month/year.

    If an adjustment object is provided, its overtime_hours and additional_allowance
    are applied on top of the base values.

    calculation_mode:
      - "SALARY" (default): basic_salary from SalaryStructure or Position.
      - "TIMESHEET": regular pay = attendance hours_worked × hourly rate.
    """
    from apps.salary.models import SalaryStructure, EmployeeAllowance
    from apps.loans.models import Loan

    # ── Determine regular pay (basic salary) ──────────────────────────
    timesheet_hourly_rate = None
    if calculation_mode == "TIMESHEET" and attendance_records:
        pos_ts = employee.position
        if pos_ts and pos_ts.regular_ot_rate is not None:
            timesheet_hourly_rate = pos_ts.regular_ot_rate
        else:
            ss = SalaryStructure.objects.filter(employee=employee, is_active=True).first()
            base = ss.basic_salary if ss else (pos_ts.basic_salary if pos_ts else Decimal("0.00"))
            timesheet_hourly_rate = calculate_monthly_hourly_rate(base)

        total_regular_hours = Decimal("0.00")
        for rec in attendance_records:
            if getattr(rec, "status", "") != "ABSENT":
                hrs = _to_decimal(rec.hours_worked)
                ot = _to_decimal(rec.overtime_hours or Decimal("0.00"))
                total_regular_hours += hrs - ot

        basic_salary = (timesheet_hourly_rate * total_regular_hours).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    else:
        # Standard salary mode
        if calculation_mode == "TIMESHEET":
            basic_salary = Decimal("0.00")
        else:
            salary_structure = SalaryStructure.objects.filter(
                employee=employee, is_active=True
            ).first()
            if salary_structure:
                basic_salary = salary_structure.basic_salary
            elif employee.position and employee.position.basic_salary is not None:
                basic_salary = _to_decimal(employee.position.basic_salary)
            else:
                basic_salary = Decimal("0.00")

    # Allowances — base from EmployeeAllowance records
    allowances = EmployeeAllowance.objects.filter(employee=employee, is_active=True).select_related("allowance_type")
    total_allowances = Decimal("0.00")
    taxable_allowances = Decimal("0.00")
    for allowance in allowances:
        total_allowances += allowance.amount
        if allowance.allowance_type.is_taxable:
            taxable_allowances += allowance.amount

    # Apply ad-hoc adjustment allowances if provided
    if adjustment and adjustment.additional_allowance > 0:
        total_allowances += adjustment.additional_allowance
        taxable_allowances += adjustment.additional_allowance  # ad-hoc is taxable by default

    # Overtime — use Position-level OT rates if set, otherwise fallback rate
    pos = employee.position
    if pos and pos.regular_ot_rate is not None:
        regular_ot_rate = pos.regular_ot_rate
    elif timesheet_hourly_rate is not None:
        regular_ot_rate = timesheet_hourly_rate
    else:
        regular_ot_rate = calculate_monthly_hourly_rate(basic_salary)

    if pos and pos.holiday_ot_rate is not None:
        holiday_ot_rate = pos.holiday_ot_rate
    elif timesheet_hourly_rate is not None:
        holiday_ot_rate = timesheet_hourly_rate
    else:
        holiday_ot_rate = calculate_monthly_hourly_rate(basic_salary)

    # Look up OT multipliers from OvertimeRate model
    from apps.salary.models import OvertimeRate
    ot_mults = {r.name.lower(): r.multiplier for r in OvertimeRate.objects.filter(is_active=True)}
    regular_mul = ot_mults.get("regular overtime", Decimal("1.5"))
    holiday_mul = ot_mults.get("public holiday", Decimal("2.0"))

    # Regular OT hours (from attendance + adjustment)
    reg_ot = overtime_hours
    if adjustment and adjustment.regular_ot_hours > 0:
        reg_ot += adjustment.regular_ot_hours

    # Holiday OT hours (from adjustment only)
    hol_ot = Decimal("0.00")
    if adjustment and adjustment.holiday_ot_hours > 0:
        hol_ot = adjustment.holiday_ot_hours

    overtime_amount = calculate_overtime(regular_ot_rate, reg_ot, regular_mul)
    overtime_amount += calculate_overtime(holiday_ot_rate, hol_ot, holiday_mul)

    gross_salary = basic_salary + total_allowances + overtime_amount

    # SSNIT
    ssnit = calculate_ssnit(basic_salary)
    ssnit_employee = ssnit["employee_contribution"]
    ssnit_employer = ssnit["employer_contribution"]

    # Tier 2 & 3
    tier2_employer = calculate_tier2(basic_salary)
    tier3 = calculate_tier3(basic_salary)

    # Taxable income
    taxable_income = basic_salary + taxable_allowances + overtime_amount - ssnit_employee

    # PAYE
    paye_tax = calculate_paye(taxable_income)

    # Loans
    active_loans = Loan.objects.filter(employee=employee, status="ACTIVE")
    loan_deduction = _to_decimal(sum(loan.monthly_deduction for loan in active_loans))

    total_deductions = ssnit_employee + paye_tax + loan_deduction

    return {
        "basic_salary": basic_salary,
        "total_allowances": total_allowances,
        "overtime_amount": overtime_amount,
        "gross_salary": gross_salary,
        "ssnit_employee": ssnit_employee,
        "ssnit_employer": ssnit_employer,
        "tier2_employee": Decimal("0.00"),
        "tier2_employer": tier2_employer,
        "tier3_employee": tier3["employee"],
        "tier3_employer": tier3["employer"],
        "taxable_income": taxable_income,
        "paye_tax": paye_tax,
        "loan_deduction": loan_deduction,
        "other_deductions": Decimal("0.00"),
        "total_deductions": total_deductions,
        "net_salary": gross_salary - total_deductions,
    }


def generate_payslip_pdf(payslip):
    """
    Generate a professional PDF payslip for a given Payslip instance.
    Returns the PDF as bytes.
    """
    import calendar
    from io import BytesIO
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm, cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    from apps.salary.models import BusinessProfile

    emp = payslip.employee
    month_name = calendar.month_name[payslip.payroll_run.month]
    biz = BusinessProfile.get_profile()

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=15*mm, bottomMargin=15*mm,
        leftMargin=15*mm, rightMargin=15*mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "PayslipTitle", parent=styles["Title"],
        fontSize=20, leading=24, textColor=colors.HexColor("#1e40af"),
        spaceAfter=2*mm,
    )
    heading_style = ParagraphStyle(
        "PayslipHeading", parent=styles["Normal"],
        fontSize=10, leading=14, textColor=colors.HexColor("#475569"),
    )
    section_style = ParagraphStyle(
        "SectionHead", parent=styles["Normal"],
        fontSize=11, leading=14, textColor=colors.HexColor("#1e293b"),
        spaceBefore=4*mm, spaceAfter=2*mm, fontName="Helvetica-Bold",
    )
    section_tight = ParagraphStyle(
        "SectionTight", parent=section_style,
        spaceBefore=0, spaceAfter=0,
    )
    normal = ParagraphStyle(
        "NormalSmall", parent=styles["Normal"],
        fontSize=9, leading=13,
    )
    bold_small = ParagraphStyle(
        "BoldSmall", parent=styles["Normal"],
        fontSize=9, leading=13, fontName="Helvetica-Bold",
    )
    amount_style = ParagraphStyle(
        "Amount", parent=styles["Normal"],
        fontSize=9, leading=13, alignment=TA_RIGHT,
    )
    total_style = ParagraphStyle(
        "Total", parent=styles["Normal"],
        fontSize=9, leading=13, fontName="Helvetica-Bold", alignment=TA_RIGHT,
    )
    net_style = ParagraphStyle(
        "NetPay", parent=styles["Normal"],
        fontSize=16, leading=20, fontName="Helvetica-Bold",
        alignment=TA_CENTER, textColor=colors.HexColor("#15803d"),
        spaceBefore=2*mm, spaceAfter=2*mm,
    )

    elements = []

    # ── Header ────────────────────────────────────
    biz_name = biz.company_name or "HR Pro"
    biz_details = ", ".join(filter(None, [biz.address, biz.phone, biz.email, biz.tin_number]))
    biz_info = Paragraph(
        biz_details,
        ParagraphStyle("BizInfo", parent=heading_style, fontSize=8, leading=10,
                       textColor=colors.HexColor("#64748b")),
    ) if biz_details else Paragraph("", heading_style)

    header_data = [
        [
            Paragraph(biz_name, title_style),
            Paragraph(
                f'<b>PAYSLIP</b> &nbsp; {month_name} {payslip.payroll_run.year}',
                ParagraphStyle("HeaderRight", parent=heading_style,
                               alignment=TA_RIGHT, fontSize=12, leading=16,
                               textColor=colors.HexColor("#1e40af")),
            ),
        ],
        [
            biz_info,
            Paragraph("", heading_style),
        ],
    ]
    header_tbl = Table(header_data, colWidths=[doc.width * 0.5, doc.width * 0.5])
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(header_tbl)
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    elements.append(Spacer(1, 3*mm))

    # ── Employee Details ──────────────────────────
    emp_data = [
        [Paragraph("<b>Employee</b>", bold_small),
         Paragraph("<b>Details</b>", bold_small)],
        [Paragraph("Name:", normal), Paragraph(emp.full_name, bold_small)],
        [Paragraph("ID:", normal), Paragraph(emp.employee_id, normal)],
        [Paragraph("Department:", normal),
         Paragraph(emp.department.name if emp.department_id else "—", normal)],
        [Paragraph("Position:", normal),
         Paragraph(emp.position.title if emp.position_id else "—", normal)],
        [Paragraph("TIN:", normal), Paragraph(emp.tin_number or "—", normal)],
        [Paragraph("SSNIT No:", normal), Paragraph(emp.ssnit_number or "—", normal)],
    ]
    emp_tbl = Table(emp_data, colWidths=[40*mm, doc.width - 40*mm])
    emp_tbl.setStyle(TableStyle([
        ("SPAN", (0, 0), (1, 0)),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(emp_tbl)
    elements.append(Spacer(1, 4*mm))

    # ── Earnings & Deductions side-by-side ────────
    fmt_money = lambda v: f"GHS {v:,.2f}"

    line_item = lambda label, value, amount: [
        Paragraph(label, normal),
        Paragraph(amount, amount_style),
    ]

    side_col_w = doc.width * 0.48
    gap_w = doc.width * 0.04
    inner_label_w = side_col_w * 0.55
    inner_amount_w = side_col_w - inner_label_w

    earnings_rows = [
        [Paragraph("<b>EARNINGS</b>", section_tight), Paragraph("", normal)],
        line_item("Basic Salary", payslip.basic_salary, fmt_money(payslip.basic_salary)),
        line_item("Total Allowances", payslip.total_allowances, fmt_money(payslip.total_allowances)),
        line_item("Overtime", payslip.overtime_amount, fmt_money(payslip.overtime_amount)),
        [
            Paragraph("<b>GROSS SALARY</b>", total_style),
            Paragraph(fmt_money(payslip.gross_salary), total_style),
        ],
    ]
    earnings_tbl = Table(earnings_rows, colWidths=[inner_label_w, inner_amount_w])
    earnings_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("LINEABOVE", (0, 4), (-1, 4), 0.5, colors.HexColor("#94a3b8")),
    ]))

    deductions_rows = [
        [Paragraph("<b>DEDUCTIONS</b>", section_tight), Paragraph("", normal)],
        line_item("SSNIT (Employee)", payslip.ssnit_employee, fmt_money(payslip.ssnit_employee)),
        line_item("PAYE Tax", payslip.paye_tax, fmt_money(payslip.paye_tax)),
        line_item("Loan Deduction", payslip.loan_deduction, fmt_money(payslip.loan_deduction)),
        line_item("Other Deductions", payslip.other_deductions, fmt_money(payslip.other_deductions)),
        [
            Paragraph("<b>TOTAL DEDUCTIONS</b>", total_style),
            Paragraph(fmt_money(payslip.total_deductions), total_style),
        ],
    ]
    deductions_tbl = Table(deductions_rows, colWidths=[inner_label_w, inner_amount_w])
    deductions_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("LINEABOVE", (0, 5), (-1, 5), 0.5, colors.HexColor("#94a3b8")),
    ]))

    combined = Table(
        [[earnings_tbl, Paragraph("", normal), deductions_tbl]],
        colWidths=[side_col_w, gap_w, side_col_w],
    )
    combined.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(combined)

    # ── Net Salary ────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e40af")))
    elements.append(Spacer(1, 2*mm))
    net_line = [
        Paragraph("NET PAY (Take Home)", ParagraphStyle(
            "NetLabel", parent=normal, fontSize=11, leading=15, fontName="Helvetica-Bold",
            alignment=TA_CENTER, textColor=colors.HexColor("#1e293b"),
        )),
    ]
    net_amount = Paragraph(fmt_money(payslip.net_salary), net_style)
    elements.append(net_line[0])
    elements.append(net_amount)
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e40af")))
    elements.append(Spacer(1, 3*mm))

    # ── Footer ────────────────────────────────────
    status_text = "Final" if payslip.status == "FINAL" else "Draft"
    footer_data = [
        [
            Paragraph(
                f'Status: <b>{status_text}</b> &nbsp;|&nbsp; Email sent: '
                f'{"Yes" if payslip.email_sent else "No"}',
                heading_style,
            ),
            Paragraph(
                "For queries, contact HR<br/>Generated by HR Pro",
                ParagraphStyle("FooterRight", parent=heading_style, alignment=TA_RIGHT),
            ),
        ],
    ]
    footer_tbl = Table(footer_data, colWidths=[doc.width * 0.5, doc.width * 0.5])
    footer_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(footer_tbl)

    doc.build(elements)
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes

