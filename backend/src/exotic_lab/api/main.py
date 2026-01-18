from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

#imports the math engine functions
from exotic_lab.pricers.asian_mc import price_asian_option
from exotic_lab.greeks.finite_diff import calculate_greeks
from exotic_lab.pricers.black_scholes import black_scholes_price 
from exotic_lab.pricers.european_mc import price_european_mc
from exotic_lab.db.cache import SimulationCache

cache = SimulationCache()

app = FastAPI()

#allows the frontend to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:3000"], #next.js runs here
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

#defines the data structure
class PricingRequest(BaseModel):
    S0: float = 100.0 #spot price
    K: float = 100.0 #strike price
    T: float = 1.0 #time to expiry (years)
    r: float = 0.05 #risk-free rate (5%)
    sigma: float = 0.2 # volatility (20%)
    q: float = 0.0 #dividend yield
    steps: int = 100 #simulation steps
    n_sims: int = 10000 #number of paths
    use_antithetic: bool = True #if we use antithetic

#endpoint
@app.post("/price/asian")
async def calculate_price(req: PricingRequest):
    #check cache for result
    cached_result = cache.get(req.model_dump())
    if cached_result:
        #return cached result and mark it
        cached_result["from_cache"] = True
        return cached_result
    
    start_time = time.time()

    #calls the math engine and calculates price and paths
    result = price_asian_option(
        req.S0, req.K, req.T, req.r, req.sigma, req.q, req.steps, req.n_sims, "call", req.use_antithetic
    )

    #calculate greeks
    #this is an expensive operation so we do it explicity
    #for a reall app this might be a separate endoing but for resume bundling shows a complete data payload
    greeks = calculate_greeks(
        req.S0, req.K, req.T, req.r, req.sigma, req.q, req.steps, req.n_sims, "call", req.use_antithetic
    )
    #merge result
    result["greeks"] = greeks

    #calculate execution time (used for performance metrics)
    result["runtime_ms"] = (time.time() - start_time) * 1000

    result["from_cache"] = False

    cache.set(req.model_dump(), result)

    return result

@app.get("/health")
async def health_check():
    return {"status": "ok"}


#validation endpoint
@app.post("/validate/european")
async def validate_model(req: PricingRequest):

    """
    compares monte carlo result against black-scholes analytical formula
    """

    #exact price with black-scholes
    bs_price = black_scholes_price(req.S0, req.K, req.T, req.r, req.sigma, req.q, "call")

    #approximate the price with monte carlo
    mc_result = price_european_mc(
        req.S0, req.K, req.T, req.r, req.sigma, req.q, req.steps, req.n_sims, "call", req.use_antithetic
    )
    mc_price = mc_result["price"]
    error = abs(mc_price - bs_price)
    error_precent = (error / bs_price) * 100

    #check if bsm result is within the mc confidence interval (the standard for validation)
    ci_low, ci_high = mc_result["conf_interval_95"]
    is_valid = ci_low <= bs_price <= ci_high

    return{
        "bs_price": bs_price,
        "mc_price": mc_price,
        "error_abs": error,
        "error_percent": error_precent,
        "within_confidence_interval": is_valid,
        "conf_interval_95": mc_result["conf_interval_95"]
    }

@app.post("/analytics/convergence")
async def convergence_analysis(req: PricingRequest):
    """
    runs simulatio with increasing N to visualize convergence
    """

    sim_counts = [100, 500, 1000, 5000, 10000, 20000]
    results = []

    #calculates the true bsm price
    bs_price = black_scholes_price(req.S0, req.K, req.T, req.r, req.sigma, req.q, "call")

    for n in sim_counts:
        #runs asian pricer but can also run european to check against bsm
        res = price_asian_option(
            req.S0, req.K, req.T, req.r, req.sigma, req.q, req.steps, n, "call", req.use_antithetic
        )
        results.append({
            "simulations": n,
            "price": res["price"],
            "ci_lower": res["conf_interval_95"][0],
            "ci_upper": res["conf_interval_95"][1]
        })

    return{
        "bs_price_ref": bs_price, #reference for european and context for asian
        "convergence_data": results
    }

