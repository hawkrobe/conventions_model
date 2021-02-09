#!/bin/bash#
# parallel --bar --colsep ',' "sh ./run_simulations.sh {1} {2} {3} {4}" :::: input/reps.csv
/mnt/bucket/people/robertdh/.webppl/webppl partnerspecificity_listener.wppl --require ./refModule/ --require webppl-csv -- --model $1 --alpha $2 --costWeight $3 --chainNum $4
# /mnt/bucket/people/robertdh/.webppl/webppl partnerspecificity_speaker.wppl --require ./refModule/ --require webppl-csv -- --model $1 --alpha $2 --costWeight $3 --chainNum $4
# /mnt/bucket/people/robertdh/.webppl/webppl network_simulation.wppl --require ./refModule/ --require webppl-csv -- --model $1 --alpha $2 --costWeight $3 --chainNum $4
