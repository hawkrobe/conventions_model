import csv
import numpy as np

chainNum = 0
with open('arbitrariness_grid.csv', 'w') as csv_file :
    writer = csv.writer(csv_file, delimiter=',')
    writer.writerow(['gameNum', 'discountFactor', 'speakerAlpha', 'listenerAlpha'])
    for speakerAlpha in range(1, 20, 1):
        for listenerAlpha in range(1, 20, 1): 
            for discountFactor in [0.6, 0.8, 1] :
                for gameID in range(10) :
                    writer.writerow([chainNum, speakerAlpha, listenerAlpha, discountFactor])
                    chainNum = chainNum + 1
