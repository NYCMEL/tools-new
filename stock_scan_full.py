#!/usr/bin/env python3

import warnings
from datetime import datetime
from pathlib import Path

try:
    from urllib3.exceptions import NotOpenSSLWarning
    warnings.filterwarnings("ignore", category=NotOpenSSLWarning)
except Exception:
    pass

import pandas as pd
import yfinance as yf

WATCHLIST = [
    "AAPL", "AFRM", "AMAT", "AMD", "AMZN", "ARM", "AVGO", "AXP", "BA", "BLK",
    "CAT", "COIN", "COP", "COST", "CSCO", "CVX", "GD", "GOOG", "GS", "HD",
    "HOOD", "INTC", "JNJ", "JPM", "KO", "LMT", "MA", "MCD", "META", "MRK",
    "MRVL", "MSFT", "MU", "NBIS", "NFLX", "NOC", "NVDA", "ORCL", "OXY", "PYPL",
    "QQQ", "RTX", "SHEL", "SHW", "SKHY", "SNDK", "SNOW", "SPCX", "SPY", "STX",
    "TRV", "TSLA", "UNH", "V", "WDC", "XOM"
]

HISTORY_PERIOD = "5y"
MAX_RECOVERY_DAYS = 40
TRADING_DAYS_PER_WEEK = 5
MIN_ANALOGS = 3


def scalar(value):
    """Return a native Python scalar."""
    try:
        return value.item()
    except Exception:
        try:
            return value.iloc[0]
        except Exception:
            return value


def price_series(df, column):
    """Return one clean Series even with yfinance MultiIndex columns."""
    data = df[column]
    if isinstance(data, pd.DataFrame):
        data = data.iloc[:, 0]
    return pd.to_numeric(data, errors="coerce").dropna()


def previous_week_low(df):
    x = price_series(df, "Low").to_frame("Low")
    x.index = pd.to_datetime(x.index).tz_localize(None)
    x["Week"] = x.index.to_period("W-FRI")
    weeks = sorted(x["Week"].unique())
    if len(weeks) < 2:
        return None
    return scalar(x.loc[x["Week"] == weeks[-2], "Low"].min())


def previous_month_low(df):
    x = price_series(df, "Low").to_frame("Low")
    x.index = pd.to_datetime(x.index).tz_localize(None)
    x["Month"] = x.index.to_period("M")
    months = sorted(x["Month"].unique())
    if len(months) < 2:
        return None
    return scalar(x.loc[x["Month"] == months[-2], "Low"].min())


def estimate_recovery(df):
    """
    Compare the current pullback with similar five-year historical pullbacks.
    Recovery means closing back at the prior 20-session high.
    """
    close = price_series(df, "Close")
    if len(close) < 100:
        return None

    rolling_high = close.rolling(20, min_periods=10).max()
    target = float(rolling_high.iloc[-1])
    current = float(close.iloc[-1])
    current_drawdown = (current / target) - 1.0

    if current_drawdown >= 0:
        return {
            "weeks": 1, "probability": 100, "analogs": 0,
            "drawdown": 0.0, "target": target, "confidence": "N/A"
        }

    magnitude = abs(current_drawdown)
    tolerance = max(0.015, magnitude * 0.35)
    lower = max(0.01, magnitude - tolerance)
    upper = magnitude + tolerance
    recoveries = []
    comparable_events = 0
    last_event = -MAX_RECOVERY_DAYS
    final_start = len(close) - MAX_RECOVERY_DAYS - 1

    for i in range(20, max(20, final_start)):
        historical_target = float(rolling_high.iloc[i])
        if pd.isna(historical_target) or historical_target <= 0:
            continue

        historical_drawdown = 1.0 - (float(close.iloc[i]) / historical_target)
        prior_high = float(rolling_high.iloc[i - 1])
        prior_drawdown = 1.0 - (float(close.iloc[i - 1]) / prior_high)

        if not (lower <= historical_drawdown <= upper):
            continue
        if lower <= prior_drawdown <= upper or i - last_event < MAX_RECOVERY_DAYS:
            continue

        comparable_events += 1
        last_event = i
        future = close.iloc[i + 1:i + 1 + MAX_RECOVERY_DAYS]
        recovered = future[future >= historical_target]
        if not recovered.empty:
            recovery_days = close.index.get_loc(recovered.index[0]) - i
            recoveries.append(recovery_days)

    if comparable_events == 0:
        return None

    probability = round(100 * len(recoveries) / comparable_events)
    if recoveries:
        median_days = float(pd.Series(recoveries).median())
        weeks = max(1, min(8, round(median_days / TRADING_DAYS_PER_WEEK)))
    else:
        weeks = 8

    if comparable_events >= 8 and probability >= 65:
        confidence = "HIGH"
    elif comparable_events >= MIN_ANALOGS and probability >= 45:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    return {
        "weeks": weeks,
        "probability": probability,
        "analogs": comparable_events,
        "drawdown": current_drawdown * 100,
        "target": target,
        "confidence": confidence
    }


def recovery_text(estimate):
    if estimate is None:
        return "RECOVERY: insufficient history"
    return (
        f"RECOVERY: {estimate['weeks']} week(s) | "
        f"8-week probability: {estimate['probability']}% | "
        f"analogs: {estimate['analogs']} | "
        f"confidence: {estimate['confidence']} | "
        f"drawdown: {estimate['drawdown']:.1f}% | "
        f"target: ${estimate['target']:.2f}"
    )


def create_pdf_report(rows):
    """Create a timestamped PDF report in the user's Downloads directory."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        )
    except ImportError:
        print("PDF NOT CREATED: install ReportLab with:")
        print("  python3 -m pip install reportlab")
        return None

    downloads = Path.home() / "Downloads"
    output_dir = downloads if downloads.is_dir() else Path.cwd()
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    output_file = output_dir / f"stock_scan_report_{timestamp}.pdf"

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#17324D"),
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#536273"),
        alignment=TA_CENTER,
    )
    cell_style = ParagraphStyle(
        "Cell",
        parent=styles["Normal"],
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#1F2933"),
    )
    header_style = ParagraphStyle(
        "Header",
        parent=cell_style,
        fontName="Helvetica-Bold",
        textColor=colors.white,
        alignment=TA_CENTER,
    )

    document = SimpleDocTemplate(
        str(output_file),
        pagesize=landscape(letter),
        rightMargin=0.35 * inch,
        leftMargin=0.35 * inch,
        topMargin=0.45 * inch,
        bottomMargin=0.45 * inch,
        title="Stock Pullback and Recovery Report",
        author="Stock Scanner",
    )

    story = [
        Paragraph("Stock Pullback and Recovery Report", title_style),
        Paragraph(
            f"Generated {datetime.now().strftime('%B %d, %Y at %I:%M %p')} | "
            "Recovery target: prior 20-session high | History analyzed: 5 years",
            subtitle_style,
        ),
        Spacer(1, 0.22 * inch),
    ]

    if not rows:
        story.append(Paragraph("NOTHING TO REPORT!", styles["Heading2"]))
    else:
        headings = [
            "Signal", "Ticker", "Current", "Recovery", "8-Week<br/>Probability",
            "Analogs", "Confidence", "Drawdown", "Target"
        ]
        table_data = [[Paragraph(value, header_style) for value in headings]]

        for row in rows:
            estimate = row["estimate"]
            if estimate is None:
                values = [
                    row["signal"], row["symbol"], f"${row['current']:.2f}",
                    "Insufficient history", "-", "-", "-", "-", "-"
                ]
            else:
                values = [
                    row["signal"],
                    row["symbol"],
                    f"${row['current']:.2f}",
                    f"{estimate['weeks']} week(s)",
                    f"{estimate['probability']}%",
                    str(estimate["analogs"]),
                    estimate["confidence"],
                    f"{estimate['drawdown']:.1f}%",
                    f"${estimate['target']:.2f}",
                ]
            table_data.append([Paragraph(str(value), cell_style) for value in values])

        table = Table(
            table_data,
            repeatRows=1,
            colWidths=[
                0.75 * inch, 0.62 * inch, 0.72 * inch, 0.95 * inch,
                0.92 * inch, 0.62 * inch, 0.82 * inch, 0.76 * inch, 0.76 * inch
            ],
            hAlign="CENTER",
        )
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17324D")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B8C2CC")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                colors.white, colors.HexColor("#F2F5F7")
            ]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(table)
        story.append(Spacer(1, 0.18 * inch))
        story.append(Paragraph(
            "Historical estimates are informational and are not guarantees or "
            "investment advice.",
            subtitle_style,
        ))

    def add_page_number(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#536273"))
        canvas.drawRightString(
            landscape(letter)[0] - 0.35 * inch,
            0.22 * inch,
            f"Page {doc.page}",
        )
        canvas.restoreState()

    document.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    return output_file


week_buys = []
month_buys = []
estimates = {}
current_prices = {}

for symbol in WATCHLIST:
    try:
        history = yf.download(
            symbol,
            period=HISTORY_PERIOD,
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=False
        )

        if history.empty:
            print(f"{symbol}: no data")
            continue

        recent = history.tail(100)
        current = scalar(price_series(history, "Close").iloc[-1])
        current_prices[symbol] = float(current)
        week_low = previous_week_low(recent)
        month_low = previous_month_low(recent)

        is_week_buy = week_low is not None and current < week_low
        is_month_buy = month_low is not None and current < month_low

        if is_week_buy or is_month_buy:
            estimates[symbol] = estimate_recovery(history)
        if is_week_buy:
            week_buys.append(symbol)
        if is_month_buy:
            month_buys.append(symbol)

    except Exception as error:
        print(f"{symbol}: {error}")

if not week_buys and not month_buys:
    print("NOTHING TO REPORT!")
else:
    if week_buys:
        print("WEEK BUY:")
        for symbol in week_buys:
            print(f"  {symbol} | {recovery_text(estimates.get(symbol))}")
    if month_buys:
        print("MONTH BUY:")
        for symbol in month_buys:
            print(f"  {symbol} | {recovery_text(estimates.get(symbol))}")

pdf_rows = []
for symbol in week_buys:
    pdf_rows.append({
        "signal": "WEEK BUY",
        "symbol": symbol,
        "current": current_prices[symbol],
        "estimate": estimates.get(symbol),
    })
for symbol in month_buys:
    pdf_rows.append({
        "signal": "MONTH BUY",
        "symbol": symbol,
        "current": current_prices[symbol],
        "estimate": estimates.get(symbol),
    })

pdf_path = create_pdf_report(pdf_rows)
if pdf_path:
    print(f"PDF CREATED: {pdf_path}")
