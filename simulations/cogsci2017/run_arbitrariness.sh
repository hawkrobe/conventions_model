#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_arbitrariness.sh {1} {2} {3} {4} {5}" :::: input/arbitrariness_grid.csv
/mnt/bucket/people/robertdh/.webppl/webppl arbitrariness.wppl  --require ../shared --require webppl-csv -- --gameNum $1 --speakerAlpha $2 --listenerAlpha $3 --discountFactor $4 --guessingEpsilon $5

