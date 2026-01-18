import numpy as np
from scipy.stats import norm

def black_scholes_price(
    S0: float, K: float, T: float, r: float, sigma: float, option_type: str = "call"
    ) -> float:

    """
    exact analytical solution for european options and used for validation
    """

    d1 = (np.log(S0 / K) + (r + 0.05 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    if option_type == "call":
        price = S0 * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    else:
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S0 * norm.cdf(-d1)

    return float(price)