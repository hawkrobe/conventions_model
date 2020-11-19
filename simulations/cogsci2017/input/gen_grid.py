import csv
import numpy as np

chainNum = 0
with open('arbitrariness_grid.csv', 'w') as csv_file :
    writer = csv.writer(csv_file, delimiter=',')
    for speakerAlpha in [1, 2, 4, 8, 16, 32] :
        for listenerAlpha in [1, 2, 4, 8, 16, 32] : 
            for discountFactor in [0.6, 0.7, 0.8, 0.9, 1] :
                for guessingEpsilon in [0.1, 0.05, 0.01, 0.005, 0.001, 0.005, 0.0001, 0.00001] :
                    writer.writerow([chainNum, speakerAlpha, listenerAlpha, discountFactor, guessingEpsilon])
                    chainNum = chainNum + 1

chainNum = 0
with open('conjunction_grid.csv', 'w') as csv_file :
    writer = csv.writer(csv_file, delimiter=',')
    for alpha in [1, 2, 4, 8, 16, 32] :
        for discountFactor in [0.6, 0.8, 1] :
            for costWeight in [1, 2, 4, 8, 16, 32] :
                for guessingEpsilon in [0.1, 0.01, 0.001, 0.0001, 0.00001] :
                    writer.writerow([chainNum, alpha, alpha, discountFactor, costWeight, guessingEpsilon])
                    chainNum = chainNum + 1
