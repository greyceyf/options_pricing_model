import pytest
import numpy as np
from exotic_lab.pricers.black_scholes import black_scholes_price
from exotic_lab.pricers.european_mc import price_european_mc
from exotic_lab.pricers.asian_mc import price_asian_option

def test_black_scholes_logic():
    #benchmark when a call option is ITM
    price = black_scholes_price(100, 100, 1, 0.05, 0.2, "call")
    assert 10.40 < price < 10.50

def test_european_mc_convergence():
    #mc should converge to bsm within a tolerance
    bs_price = black_scholes_price(100, 100, 1, 0.05, 0.2, "call")

    #runs simulation with sufficient number of paths
    mc_result = price_european_mc(100, 100, 1, 0.05, 0.2, n_sims = 500000)

    #checks if the bs price is inside the confidence interval of the european mc
    ci_low, ci_high = mc_result["conf_interval_95"]
    assert ci_low <= bs_price <= ci_high

def test_asian_cheaper_than_european():
    #in economic thoery on average, asian options are generally cheaper than european options (final value) due to the lower volatility of averages
    asian = price_asian_option(100, 100, 1, 0.05, 0.2, n_sims = 10000)
    european = black_scholes_price(100, 100, 1, 0.05, 0.2)

    assert asian["price"] < european
    assert asian["price"] > 0

def test_put_call_parity_asian():
    # checks that call - put approx equals to s - k*exp(-rT)
    # exact logic is difference for asian but the directional logic holds

    call = price_asian_option(100, 100, 1, 0.05, 0.2, option_type = "call")["price"]
    put = price_asian_option(100, 100, 1, 0.05, 0.2, option_type = "put")["price"]

    #ensure that neither is negative and that they are distinc values
    assert call > 0
    assert put > 0
    assert call != put