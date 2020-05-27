#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_grid_search.sh {1} {2} {3} {4}" :::: input/grid.csv
/mnt/bucket/people/robertdh/.webppl/webppl partnerspecificity_speaker.wppl --require ./refModule/ --require webppl-csv -- --alpha $1 --costWeight $2 --priorSigma $3 --chainNum $4
