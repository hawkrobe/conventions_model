import os, glob, sys, shutil
import numpy as np
import datetime
import json
import pandas as pd
from pandas.io.json import json_normalize

## to run: python nosub_wrapper.py --sandbox=False --action=status

##### TODO 7/6/18: adapt this to work with nosub b/c it is currently using nosub syntax

if __name__ == '__main__':
    '''
    nosub_wrapper is a way to run nosub multiple times
    to post, download multiple batches of HITs by running
    nosub in separate modular folders.
    
    Each subdir can maintain one hit at a time, with a number of assignments that you define.
    
    '''
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', type=str, default='download',
                        help="upload|expire|status|download|approve|reset")
    parser.add_argument('--sandbox', type=str, default="True",
                        help="True if running on sandbox else False")
    args = parser.parse_args()
    def call_nosub (cmd) :
        os.system("nosub {} {}".format(
            '-p' if args.sandbox=="False" else '',
            cmd
        ))

    assert args.action in ['upload', 'expire', 'download', 'approve', 'reset', 'status']    
    print('Sandbox mode: ' + str(args.sandbox))
    print('Current action is: ' + args.action)
    # # go into each template folder and use nosub to upload
    if args.action == 'upload':
        print('Now trying to upload HITs...')
        call_nosub("upload")
    elif args.action == 'expire':
        print('Now expiring HITs from all batches...')
        call_nosub("expire")
    elif args.action == 'download':
        print('Now trying to download results')
        call_nosub("download --deanonymize")
    elif args.action == 'status':
        print('Now checking the status')
        call_nosub('status')
    elif args.action == 'approve':
        print('generating source from info.csv')
        info = (pd.read_csv('../data/info.csv', converters={'details':json.loads})
                .query('contents == "disconnect"'))

        info = (json_normalize(info['details'])
                .rename(columns = {'participantid' : 'id'})
                .drop_duplicates()
                .drop('type', axis=1)
        )
        participant = pd.read_csv('../data/participant.csv')[['id', 'assignment_id', 'worker_id']]
        joined = info.join(participant.set_index('id'), on='id')
        (joined.drop('id', axis=1)
         .rename(columns={'worker_id' : 'wID', 'assignment_id' : 'aID', 'score' : 'bonus'})
         .to_csv('./bonus_source.csv'))
        print('Now trying to approve work')
        try:
            cmd = 'python approve-work.py {} --source ./bonus_source.csv'.format(
                '-p' if args.sandbox=="False" else ''
            )
            os.system(cmd)
        except:
            raise
    elif args.action == 'reset':
        curr_time = str(datetime.datetime.now())
        print('Now renaming hit-ids.json to hit-ids_{}.json and moving to hit-ids folder'
              .format(curr_time))
        if not os.path.exists('hit-ids'):
            os.makedirs('hit-ids')
        if args.sandbox=="True":
            os.rename('hit-ids.json','sandbox_hit-ids/hit-ids_{}.json'.format(curr_time))
        elif args.sandbox=="False":
            os.rename('hit-ids.json','hit-ids/hit-ids_{}.json'.format(curr_time))
