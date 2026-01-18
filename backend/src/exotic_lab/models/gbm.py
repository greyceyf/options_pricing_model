import numpy as np

def simulate_gbm_paths(
    S0: float, T: float, r: float, sigma: float, q: float, steps: int, n_sims: int, use_antithetic: bool = False
) -> np.ndarray:
    dt = T / steps

    if use_antithetic:
        #generate half the noise and then mirror it
        n_paths = n_sims // 2
        Z = np.random.normal(0, 1 , (n_paths, steps))
        Z = np.concatenate([Z, -Z], axis = 0)
        #if n_sims is odd we lose a path but it's negligible
    else:
        #generate random noise (used to infuse randomness into the system)
        Z = np.random.normal(0, 1, (n_sims, steps))

    #calculates drift and diffusion
    drift = (r - q - 0.5 * sigma**2) * dt
    diffusion = sigma * np.sqrt(dt) * Z

    #evolve price paths
    #the shape is (n_sims, steps + 1)
    growth_factors = np.exp(drift + diffusion)    
    paths = np.zeros((n_sims, steps + 1))
    paths[:, 0] = S0
    paths[:, 1:] = S0 * np.cumprod(growth_factors, axis = 1)
    
    return paths
