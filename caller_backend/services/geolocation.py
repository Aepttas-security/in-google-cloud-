import requests

def get_location(ip: str):
    """
    Resolves an IP address into 8-dimensional spatial and network telemetry.
    Includes connection timeout protection and error handling.
    """
    url = f"http://ip-api.com/json/{ip}"
    try:
        response = requests.get(url, timeout=5)
        data = response.json()

        if data.get("status") == "fail":
            return {
                "ip": ip,
                "status": "fail",
                "message": data.get("message", "Resolution failed for IP")
            }

        return {
            "ip": ip,
            "country": data.get("country", "Unknown"),
            "region": data.get("regionName", "Unknown"),
            "city": data.get("city", "Unknown"),
            "isp": data.get("isp", "Unknown"),
            "lat": data.get("lat"),
            "lon": data.get("lon"),
            "status": "success"
        }
    except requests.exceptions.Timeout:
        return {"ip": ip, "status": "error", "message": "Connection to geolocation service timed out"}
    except requests.exceptions.RequestException as e:
        return {"ip": ip, "status": "error", "message": str(e)}
