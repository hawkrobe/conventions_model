import csv
import numpy as np

chainNum = 0
with open('arbitrariness_grid.csv', 'w') as csv_file :
    writer = csv.writer(csv_file, delimiter=',')
    for speakerAlpha in [1, 2, 4, 8, 16] :
        for listenerAlpha in [1,2, 4, 8, 16]: 
            for discountFactor in [0.6, 0.8, 1] :
                writer.writerow([chainNum, speakerAlpha, listenerAlpha, discountFactor])
                chainNum = chainNum + 1
