head -1 trajectory_game101_200051.csv > trajectories.csv;
tail -n +2 -q trajectory_game*.csv >> trajectories.csv;
