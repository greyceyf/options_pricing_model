import numpy as np

def simulate_gbm_paths(
    S0: float, T: float, r: float, sigma: float, steps: int, n_sims: int 
) -> np.ndarray:
    dt = T / steps

    #generate random noise (used to infuse randomness into the system)
    Z = np.random.normal(0, 1, (n_sims, steps))

    #calculates drift and diffusion
    drift = (r - 0.5 * sigma**2) * dt
    diffusion = sigma * np.sqrt(dt) * Z

    #evolve price paths
    growth_factors = np.exp(drift + diffusion)    
    paths = np.zeros((n_sims, steps + 1))
    paths[:, 0] = S0
    paths[:, 1:] = S0 * np.cumprod(growth_factors, axis = 1)
    return paths
