import numpy as np
from exotic_lab.models.gbm import simulate_gbm_paths

def price_asian_option(
    S0: float, K: float, T: float, r: float, sigma: float, q: float, steps: int = 100, n_sims: int = 10000, option_type: str = "call", use_antithetic: bool = True
) -> dict:
    
    #run simulation
    paths = simulate_gbm_paths(S0, T, r, sigma, q, steps, n_sims, use_antithetic)

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
    std_dev = np.std(payoffs)
    std_error = discount_factor * (std_dev / np.sqrt(len(payoffs)))

    #logic for the histogram, creates 50 bins for the distribution
    counts, bin_edges = np.histogram(payoffs, bins = 50)

    #calculate probability density
    total_samples = len(payoffs)
    probabilities = counts / total_samples

    #format for reacharts (center of bin)
    distribution_data = []
    for i in range(len(counts)):
        bin_center = (bin_edges[i] + bin_edges[i + 1]) / 2
        distribution_data.append({
            "value": float(bin_center),
            "probability": float(probabilities[i])
        })

    return{
        "price": float(price), 
        "std_error": float(std_error),
        "conf_interval_95": [
            float(price - 1.96 * std_error),
            float(price + 1.96 * std_error)
        ],
        "paths_sample": paths[:50].tolist(), #saves 50 paths for plotting later
        "distribution": distribution_data
    }



