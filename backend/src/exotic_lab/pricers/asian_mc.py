import numpy as np
from exotic_lab.models.gbm import simulate_gbm_paths

def price_asian_option(
    S0: float, K: float, T: float, r: float, sigma: float, steps: int = 100, n_sims: int = 10000, option_type: str = "call", use_antithetic: bool = True
) -> dict:
    
    #run simulation
    paths = simulate_gbm_paths(S0, T, r, sigma, steps, n_sims, use_antithetic)

    #average the prices (asian option logic)
    average_prices = np.mean(paths[:, 1:], axis = 1)

    #calculate payoff (call option)
    if option_type == "call":
        payoffs = np.maximum(average_prices - K, 0)
    else:
        payoffs = np.maximum(K - average_prices, 0)

    #discount to present value
    discount_factor = np.exp(-r * T)
    price = discount_factor * np.mean(payoffs)

    #statistical significance metric (standard error and standard deviation)
    std_dev = np.exp(payoffs)
    std_error = discount_factor * (std_dev / np.sqrt(len(payoffs)))

    return{
        "price": float(price), 
        "std_error": float(std_error),
        "conf_interval_95": [
            float(price - 1.96 * std_error),
            float(price + 1.96 * std_error)
        ],
        "paths_sample": paths[:50].tolist() #saves 50 paths for plotting later
    }



