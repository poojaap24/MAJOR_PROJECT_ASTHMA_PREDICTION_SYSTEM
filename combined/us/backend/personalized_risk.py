# ============================================
# PERSONALIZED ASTHMA RISK
# ============================================

# ============================================
# PERSONALIZED ASTHMA RISK
# ============================================

VALID_SEVERITIES = ("mild", "moderate", "severe")
VALID_CONDITIONS = ("none", "copd", "bronchitis", "heart")


def get_personalized_risk(pm25, age, severity, allergy, smoker=False, condition="none", outdoor_exposure=False):
    """
    Computes a personalized asthma risk level from predicted PM2.5,
    age, asthma severity, allergy status, smoking status, an existing
    respiratory/heart condition, and whether the person spends a lot
    of time outdoors (commute, outdoor job, etc.)

    Returns one of: "LOW", "MODERATE", "HIGH", "VERY HIGH"
    """

    # -------------------------
    # Input validation
    # -------------------------
    if pm25 is None or pm25 < 0:
        raise ValueError(f"Invalid pm25 value: {pm25}")

    if age is None or age < 0 or age > 120:
        raise ValueError(f"Invalid age value: {age}")

    severity = str(severity).lower().strip()
    if severity not in VALID_SEVERITIES:
        raise ValueError(
            f"Invalid severity '{severity}'. Must be one of {VALID_SEVERITIES}"
        )

    allergy = bool(allergy)
    smoker = bool(smoker)
    outdoor_exposure = bool(outdoor_exposure)

    condition = str(condition or "none").lower().strip()
    if condition not in VALID_CONDITIONS:
        condition = "none"

    # -------------------------
    # Safety override
    # Severe asthma + genuinely bad air (Poor/Very Poor by CPCB
    # standards) should always be treated as most urgent, no
    # matter what the other scores add up to. This matches how
    # real health advisories treat "sensitive groups" - they
    # don't get averaged down by unrelated factors.
    # -------------------------
    if severity == "severe" and pm25 > 90:
        return "VERY HIGH"

    # A diagnosed lung/heart condition + genuinely bad air is its own
    # override — these groups are told to treat poor air as an
    # emergency-level trigger regardless of asthma severity.
    if condition in ("copd", "heart") and pm25 > 90:
        return "VERY HIGH"

    score = 0

    # -------------------------
    # Pollution Score
    # -------------------------
    if pm25 <= 30:
        score += 1
    elif pm25 <= 60:
        score += 2
    elif pm25 <= 90:
        score += 3
    else:
        score += 4

    # -------------------------
    # Age Score
    # -------------------------
    if age < 12 or age > 60:
        score += 2
    else:
        score += 1

    # -------------------------
    # Asthma Severity Score
    # -------------------------
    if severity == "mild":
        score += 1
    elif severity == "moderate":
        score += 2
    elif severity == "severe":
        score += 3

    # -------------------------
    # Allergy Score
    # -------------------------
    if allergy:
        score += 1

    # -------------------------
    # Smoking Score
    # Smoking already inflames airways, so pollution exposure
    # compounds faster for smokers.
    # -------------------------
    if smoker:
        score += 2

    # -------------------------
    # Existing Condition Score
    # -------------------------
    if condition == "copd":
        score += 3
    elif condition == "heart":
        score += 2
    elif condition == "bronchitis":
        score += 1

    # -------------------------
    # Outdoor Exposure Score
    # More time outside means more actual inhaled pollution,
    # regardless of what the ambient reading says.
    # -------------------------
    if outdoor_exposure:
        score += 1

    # -------------------------
    # Final Risk
    # -------------------------
    if score <= 4:
        return "LOW"
    elif score <= 7:
        return "MODERATE"
    elif score <= 10:
        return "HIGH"
    else:
        return "VERY HIGH"


def get_advice(risk, smoker=False, condition="none", outdoor_exposure=False):

    advice_map = {
        "LOW": [
            "Air quality is acceptable.",
            "Normal outdoor activities are safe.",
        ],
        "MODERATE": [
            "Reduce prolonged outdoor exposure.",
            "Carry your inhaler if prescribed.",
        ],
        "HIGH": [
            "Avoid strenuous outdoor activities.",
            "Wear an N95 mask.",
            "Keep rescue inhaler nearby.",
        ],
        "VERY HIGH": [
            "Stay indoors whenever possible.",
            "Close windows.",
            "Use an air purifier if available.",
            "Keep emergency medication ready.",
            "Seek medical attention if symptoms worsen.",
        ],
    }

    if risk not in advice_map:
        raise ValueError(f"Unknown risk level: {risk}")

    advice = list(advice_map[risk])

    # -------------------------
    # Extra tailored precautions
    # -------------------------
    condition = str(condition or "none").lower().strip()

    if smoker:
        advice.append("Avoid smoking on poor air quality days — it adds directly to your lung irritation.")

    if condition == "copd":
        advice.append("With COPD, keep your rescue medication accessible at all times today.")
    elif condition == "heart":
        advice.append("With a heart condition, avoid exertion outdoors — pollution raises cardiac strain too.")
    elif condition == "bronchitis":
        advice.append("Chronic bronchitis makes airways more reactive — an N95 mask helps even on moderate days.")

    if outdoor_exposure:
        advice.append("Since you're often outdoors, consider rescheduling outdoor time to early morning when pollution is typically lower.")

    return advice