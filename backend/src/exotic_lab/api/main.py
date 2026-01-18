from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

#imports the math engine functions
from exotic_lab.pricers.asian_mc import price_asian_option
from exotic_lab.greeks.finite_diff import calculate_greeks

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
    steps: int = 100 #simulation steps
    n_sims: int = 10000 #number of paths
    use_antithetic: bool = True #if we use antithetic

#endpoint
@app.post("/price/asian")
async def calculate_price(req: PricingRequest):
    start_time = time.time()

    #calls the math engine and calculates price and paths
    result = price_asian_option(
        req.S0, req.K, req.T, req.r, req.sigma, req.steps, req.n_sims, "call", req.use_antithetic
    )

    #calculate greeks
    #this is an expensive operation so we do it explicity
    #for a reall app this might be a separate endoing but for resume bundling shows a complete data payload
    greeks = calculate_greeks(
        req.S0, req.K, req.T, req.r, req.sigma, req.steps, req.n_sims, "call", req.use_antithetic
    )
    #merge result
    result["greeks"] = greeks

    #calculate execution time (used for performance metrics)
    result["runtime_ms"] = (time.time() - start_time) * 1000

    return result

@app.get("/health")
async def health_check():
    return {"status": "ok"}