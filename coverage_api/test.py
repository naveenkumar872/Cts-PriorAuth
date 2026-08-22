import requests

TOKEN = "c0a5a6a4-0125-4966-bfcd-dc3de0f52926"

url = "https://api.coverage.cms.gov/v1/data/article/hcpc-code?articleid=60377"

headers = {
    "Authorization": f"Bearer {TOKEN}"
}

response = requests.get(url, headers=headers)

print("Status:", response.status_code)
print(response.text)