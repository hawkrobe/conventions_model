#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_grid_search.sh {1}" :::: input/grid.csv
/mnt/bucket/people/robertdh/.webppl/webppl predict_data.wppl --require ./refModule/ --require webppl-csv -- --gameNum $1
