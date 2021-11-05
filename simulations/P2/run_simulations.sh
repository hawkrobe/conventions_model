#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_simulations.sh {1} {2} {3} {4} {5} {6} {7}" :::: input/grid.csv
webppl network_simulation.wppl --require ../shared --require webppl-csv -- --model $1 --speakerAlpha $2 --listenerAlpha $3 --costWeight $4 --discountFactor $5 --guessingEpsilon $6 --chainNum $7
