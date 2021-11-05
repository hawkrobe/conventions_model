#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_grid_search.sh {1} {2} {3}" :::: input/grid.csv
/mnt/bucket/people/robertdh/.webppl/webppl run_simulation.wppl --require ../shared/ --require webppl-csv -- --gameNum $1 --speakerAlpha $2 --listenerAlpha $3 --discountFactor $4 --guessingEpsilon $5

