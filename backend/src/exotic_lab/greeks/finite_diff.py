from exotic_lab.pricers.asian_mc import price_asian_option

def calculate_greeks(
    S0: float, K: float, T: float, r: float, sigma: float, steps: int, n_sims: int, option_type: str = "call"
) -> dict:
    
    """
    computes greeks using central finite differences (bump & revalue)
    """

    