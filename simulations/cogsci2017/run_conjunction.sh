#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_conjunction.sh {1} {2} {3} {4} {5} {6}" :::: input/conjunction_grid.csv
/mnt/bucket/people/robertdh/.webppl/webppl conjunction.wppl --require webppl-csv --require ../shared/ -- --gameNum $1 --speakerAlpha $2 --listenerAlpha $3 --discountFactor $4 --costWeight $5 --guessingEpsilon $6
