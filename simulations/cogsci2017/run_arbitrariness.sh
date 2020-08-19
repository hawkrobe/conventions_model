#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_grid_search.sh {1} {2} {3}" :::: input/grid.csv
webppl arbitrariness_new.wppl --require ./refModule/ --require webppl-csv -- --gameNum $1 --discountFactor $2 --coord $3 

