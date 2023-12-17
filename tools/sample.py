import os
import sys
import time

filepath = sys.argv[1]

filename = os.path.basename(os.path.splitext(filepath)[0])

outdir = f"{os.getcwd()}/tmp"

if (os.path.exists(outdir) == False):
    os.makedirs(outdir)

print(f"{outdir}/{filename}.bmp")

sys.stdout.flush()