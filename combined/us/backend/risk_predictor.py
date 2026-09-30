def get_risk(pm25):
    if pm25 <= 30:
        return "LOW"
    elif pm25 <= 60:
        return "MODERATE"
    elif pm25 <= 90:
        return "HIGH"
    else:
        return "VERY HIGH"