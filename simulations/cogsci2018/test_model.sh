#!/bin/bash#
rm $1.json
/mnt/bucket/people/robertdh/.webppl/webppl run_simulation.wppl --require ./refModule/ --param-store --param-store file --param-id $1 --require webppl-csv -- --gameNum $1 --discountFactor $2 --coord $3

