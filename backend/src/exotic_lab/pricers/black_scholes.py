import numpy as np
from scipy.stats import norm

def black_scholes_price(
    S0: float, K: float, T: float, r: float, sigma: float, q: float, option_type: str = "call"
    ) -> float:

    """
    exact analytical solution for european options and used for validation
    """

    if T <= 1e-5 or sigma <= 1e-5:
        if option_type == "call":
            return max(S0 - K, 0.0)
        else:
            return max(K - S0, 0.0)

    d1 = (np.log(S0 / K) + (r - q + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    if option_type == "call":
        price = S0 * norm.cdf(d1) * np.exp(-q * T) - K * np.exp(-r * T) * norm.cdf(d2)
    else:
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S0 * norm.cdf(-d1) * np.exp(-q * T)

    return float(price)