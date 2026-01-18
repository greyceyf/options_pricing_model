import numpy as np

def simulate_gbm_paths(
    S0: float, T: float, r: float, sigma: float, steps: int, n_sims: int 
) -> np.ndarray:
    dt = T / steps
    Z = np.random.normal(0, 1, (n_sims, steps))
    drift = (r - 0.5 * sigma**2) * dt
    diffusion = sigma * np.sqrt(dt) * Z
    growth_factors = np.exp(drift + diffusion)    
    paths = np.zeros((n_sims, steps + 1))
    paths[:, 0] = S0
    paths[:, 1:] = S0 * np.cumprod(growth_factors, axis = 1)
    return paths
