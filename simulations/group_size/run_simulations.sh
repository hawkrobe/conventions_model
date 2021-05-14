#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_simulations.sh {1} {2} {3} {4} {5} {6} {7}" :::: input/grid.csv
export NODE_OPTIONS="--max-old-space-size=8192" #increase to 8gb
webppl network_simulation.wppl --require ../shared --require webppl-csv -- --model $1 --speakerAlpha $2 --listenerAlpha $3 --discountFactor $4 --chainNum $5
