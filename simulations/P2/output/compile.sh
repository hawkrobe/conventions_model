head -1 no_pooling0.csv > networkOutput_compiled.csv;
tail -n +2 -q no_pooling*.csv >> networkOutput_compiled.csv;
tail -n +2 -q complete_pooling*.csv >> networkOutput_compiled.csv;
tail -n +2 -q hierarchical*.csv >> networkOutput_compiled.csv;
