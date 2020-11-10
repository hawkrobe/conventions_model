#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_arbitrariness.sh {1} {2} {3} {4}" :::: input/arbitrariness_grid.csv
webppl arbitrariness_new.wppl --require ./refModule/ --require webppl-csv -- --gameNum $1 --speakerAlpha $2 --listenerAlpha $3 --discountFactor $4 

