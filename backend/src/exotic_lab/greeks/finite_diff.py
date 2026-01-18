from exotic_lab.pricers.asian_mc import price_asian_option

def calculate_greeks(
    S0: float, K: float, T: float, r: float, sigma: float, q: float, steps: int, n_sims: int, option_type: str = "call", use_antithetic: bool = True
) -> dict:
    
    """
    computes greeks using central finite differences (bump & revalue)
    """

    # delta (sensitivity to spot price)
    dS = S0 * 0.01 #represents 1% bump
    p_up = price_asian_option(S0 + dS, K, T, r, sigma, q, steps, n_sims, option_type)["price"]
    p_down = price_asian_option(S0 - dS, K, T, r, sigma, q, steps, n_sims, option_type)["price"]
    delta = (p_up - p_down) / (2 * dS)

    # gamma (sensitivity to delta)
    base = price_asian_option(S0, K, T, r, sigma, q, steps, n_sims, option_type)["price"]
    gamma = (p_up - 2*base + p_down) / (dS ** 2)

    #vega (sensitivity to volatility)
    dSigma = 0.01 #represents 1% bump
    v_up = price_asian_option(S0, K, T, r, sigma + dSigma, q, steps, n_sims, option_type)["price"]
    v_down = price_asian_option(S0, K, T, r, sigma - dSigma, q, steps, n_sims, option_type)["price"]
    vega = (v_up - v_down) / (2 * dSigma)

    #theta (time decay)
    dT = 1/365 #represents 1 day time decay
    if T > dT:
        t_decay = price_asian_option(S0, K, T - dT, r, sigma, q, steps, n_sims, option_type)["price"]
        theta = (t_decay - base)
    else:
        theta = 0.0
    
    #rho (sensitivity to interest rate)
    dr = 0.0001 #represents 1 basis point
    r_up = price_asian_option(S0, K, T, r + dr, sigma, q, steps, n_sims, option_type)["price"]
    r_down = price_asian_option(S0, K, T, r - dr, sigma, q, steps, n_sims, option_type)["price"]
    rho = (r_up - r_down) / (2 * dr)    

    return{
        "delta": float(delta),
        "gamma": float(gamma),
        "vega": float(vega),
        "theta": float(theta),
        "rho": float(rho)
    }