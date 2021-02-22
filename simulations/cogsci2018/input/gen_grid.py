import csv
from pathlib import Path
import numpy as np

folder = Path('.').rglob('game*.csv')
files = [x.stem for x in folder]
print(files)

# chainNum = 0
# with open('context_sensitivity_grid.csv', 'w') as csv_file :
#     writer = csv.writer(csv_file, delimiter=',')
#     for f in files :
#         for speakerAlpha in [1, 2, 4, 16, 64] :
#             for listenerAlpha in [1, 2, 4, 16, 64] : 
#                 for discountFactor in [0.6, 0.8, 1] :
#                     for guessingEpsilon in [0.1, 0.01, 0.001, 0.00001] :
#                         writer.writerow([chainNum, f, speakerAlpha, listenerAlpha, discountFactor, guessingEpsilon])
#                         chainNum += 1

chainNum = 200000
with open('micro-grid.csv', 'w') as csv_file :
    writer = csv.writer(csv_file, delimiter=',')
    for f in files :
        for iterationNum in range(5) :
            writer.writerow([chainNum, f, 7, 7, 0.9, 0.01])
            chainNum += 1 

