import unicodedata
from datetime import datetime

from fpdf import FPDF

from app.schemas.stats import MonthlyReport, OrganizerReportItem, PlatformOverview


def _ascii(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    return text.encode("ascii", "ignore").decode("ascii")


def build_admin_report_pdf(
    overview: PlatformOverview,
    monthly: MonthlyReport,
    organizers: list[OrganizerReportItem],
    year: int,
) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, _ascii("Raport platforma UniEvents"), new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(
        0, 6,
        _ascii(f"Generat la {datetime.now().strftime('%d.%m.%Y %H:%M')} - An raportare: {year}"),
        new_x="LMARGIN", new_y="NEXT",
    )
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    # ── Overview ─────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, _ascii("Privire de ansamblu"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)

    overview_rows = [
        ("Total evenimente", overview.total_events),
        ("Evenimente aprobate", overview.approved_events),
        ("Evenimente in asteptare", overview.pending_events),
        ("Total inscrieri", overview.total_registrations),
        ("Total feedback-uri", overview.total_feedback),
        ("Rating mediu", overview.avg_rating if overview.avg_rating is not None else "-"),
        ("Organizatori activi", overview.total_organizers),
        ("Studenti activi", overview.total_students),
    ]
    for label, value in overview_rows:
        pdf.cell(80, 8, _ascii(label), border=1)
        pdf.cell(0, 8, str(value), border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)

    # ── Monthly report ───────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, _ascii(f"Raport lunar {monthly.year}"), new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "B", 10)
    col_widths = (50, 40, 50, 50)
    headers = ("Luna", "Evenimente", "Inscrieri totale", "Medie inscrieri/eveniment")
    for w, h in zip(col_widths, headers):
        pdf.cell(w, 8, _ascii(h), border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 10)
    for item in monthly.months:
        pdf.cell(col_widths[0], 8, _ascii(item.month_name), border=1)
        pdf.cell(col_widths[1], 8, str(item.events_count), border=1)
        pdf.cell(col_widths[2], 8, str(item.total_registrations), border=1)
        avg = item.avg_registrations if item.avg_registrations is not None else "-"
        pdf.cell(col_widths[3], 8, str(avg), border=1)
        pdf.ln()

    pdf.ln(6)

    # ── Organizer leaderboard ────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, _ascii("Clasament organizatori"), new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "B", 10)
    org_col_widths = (70, 40, 40, 40)
    org_headers = ("Organizator", "Evenimente", "Rating mediu", "Participanti")
    for w, h in zip(org_col_widths, org_headers):
        pdf.cell(w, 8, _ascii(h), border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 10)
    for item in organizers:
        name = f"{item.organizer.first_name} {item.organizer.last_name}"
        pdf.cell(org_col_widths[0], 8, _ascii(name), border=1)
        pdf.cell(org_col_widths[1], 8, str(item.events_count), border=1)
        rating = item.avg_rating if item.avg_rating is not None else "-"
        pdf.cell(org_col_widths[2], 8, str(rating), border=1)
        pdf.cell(org_col_widths[3], 8, str(item.total_participants), border=1)
        pdf.ln()

    return bytes(pdf.output())
