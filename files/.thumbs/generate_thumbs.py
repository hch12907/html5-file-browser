#!/usr/bin/python 

import copy

from pathlib import Path
from subprocess import Popen

myself_path = Path('.').absolute()
myself_name = myself_path.name

spawned_magicks = []

for path in Path('../').rglob('*'):
    if path.parts[0] == ".." and path.parts[1] == myself_name:
        continue

    if path.is_dir():
        continue

    if path.suffix.lower() == ".gif":
        continue

    new_path = copy.copy(myself_path) / Path(*path.parts[1:])

    if new_path.exists():
        continue
    else:
        new_path.parent.mkdir(parents=True, exist_ok=True)

    print("generating thumbnail for", path, "in", new_path)

    magick = Popen(["magick", str(path), "-resize", "360x360", str(new_path)])
    spawned_magicks.append(magick)

    if len(spawned_magicks) > 5:
        while len(spawned_magicks) > 0:
            magick_retcode = spawned_magicks.pop().wait()

            if magick_retcode != 0:
                print("magick returned error!")

# let them finish their work
while len(spawned_magicks) > 0:
    magick_retcode = spawned_magicks.pop().wait()

    if magick_retcode != 0:
        print("magick returned error!")
