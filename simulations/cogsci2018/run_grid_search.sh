#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_grid_search.sh {1} {2} {3}" :::: input/grid.csv
/mnt/bucket/people/robertdh/.webppl/webppl run_simulation.wppl --require ./refModule/ --require webppl-csv -- --gameNum $1 --usingPragmatics true --discountFactor $2 --coord $3

