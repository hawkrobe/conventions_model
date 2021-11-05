import csv
import numpy as np

chainNum = 50000
with open('grid.csv', 'w') as csv_file :
    writer = csv.writer(csv_file, delimiter=',')
    for speakerAlpha in [1,2,4, 8, 16] :
        for listenerAlpha in [1,2] :
            for costWeight in [0,.1,.2,.3,.4,.5]:
                for discountFactor in [0.6, 0.8, 1] :
                    writer.writerow(['no_pooling', speakerAlpha, listenerAlpha, round(costWeight,2), round(discountFactor,2), 0.01, chainNum])
                    writer.writerow(['complete_pooling', speakerAlpha, listenerAlpha, round(costWeight,2), round(discountFactor,2), 0.01, chainNum])
                    writer.writerow(['hierarchical', speakerAlpha, listenerAlpha, round(costWeight,2), round(discountFactor,2), 0.01, chainNum])
                    chainNum = chainNum + 1
