import { runScript } from '../modules/fs/fs.helpers';

export const updateRepo = (repo: string, branch: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    runScript('/scripts/git.sh', ['update', repo, branch], (err: string, stdout: string) => {
      if (err) {
        reject(err);
      }

      console.info('Update result', stdout);

      resolve();
    });
  });
};

export const cloneRepo = (repo: string, branch: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    runScript('/scripts/git.sh', ['clone', repo, branch], (err: string, stdout: string) => {
      if (err) {
        reject(err);
      }

      console.info('Clone result', stdout);

      resolve();
    });
  });
};
