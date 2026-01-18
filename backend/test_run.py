import sys
import os

sys.path.append(os.path.abspath("src"))



from src.exotic_lab.pricers.asian_mc import price_asian_option

print("Running simulation...")
result = price_asian_option(S0 = 100, K = 100, T = 1, r = 0.05, sigma = 0.2)
print(f"Option Price: ${result['price']:.2f}")