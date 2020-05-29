head -1 $1no_pooling0.csv > $1_compiled.csv;
tail -n +2 -q $1*.csv >> $1_compiled.csv;
