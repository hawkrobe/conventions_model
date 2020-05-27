import csv
import numpy as np

chainNum = 0
with open('grid.csv', 'w') as csv_file :
    writer = csv.writer(csv_file, delimiter=',')
    writer.writerow(['alpha', 'costWeight', 'priorSigma', 'chainNum'])
    for alpha in range(1, 20, 1): 
        for costWeight in np.arange(0, min(alpha+0.1, 10+0.1), 1) :
            for priorSigma in [1] :
                writer.writerow([alpha, costWeight, priorSigma, chainNum])
                chainNum = chainNum + 1
