import numpy as np
from exotic_lab.models.gbm import simulate_gbm_paths

def price_asian_option(
    S0: float, K: float, T: float, r: float, sigma: float, steps: int = 100, n_sims: int = 10000
) -> dict:
    
    paths = simulate_gbm_paths(S0, T, r, sigma, steps, n_sims)
    average_prices = np.mean(paths[:, 1:], axis = 1)
    payoffs = np.maximum(average_prices - K, 0)
    price = np.exp(-r * T) * np.mean(payoffs)

    return{
        "price": float(price), 
        "paths_sample": paths[:50].tolist()
    }



