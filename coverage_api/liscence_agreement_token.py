import requests

url = "https://api.coverage.cms.gov/v1/metadata/license-agreement/"

response = requests.get(url)

print("Status:", response.status_code)
print(response.text)