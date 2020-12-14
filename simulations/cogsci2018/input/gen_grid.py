import csv
from pathlib import Path
import numpy as np

folder = Path('.').rglob('game*.csv')
files = [x.stem for x in folder]
print(files)

chainNum = 0
with open('context_sensitivity_grid.csv', 'w') as csv_file :
    writer = csv.writer(csv_file, delimiter=',')
    for f in files :
        for speakerAlpha in [1, 2, 4, 16, 64] :
            for listenerAlpha in [1, 2, 4, 16, 64] : 
                for discountFactor in [0.6, 0.8, 1] :
                    for guessingEpsilon in [0.1, 0.01, 0.001, 0.00001] :
                        writer.writerow([f, speakerAlpha, listenerAlpha, discountFactor, guessingEpsilon])

with open('micro_grid.csv', 'w') as csv_file :
    writer = csv.writer(csv_file, delimiter=',')
    for f in files :
        writer.writerow([f, 5, 5, 0.8, 0.01])

