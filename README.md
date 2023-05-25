# Requirements
  * **Deno**
  
  No brainer deno installation and deletion

```shell
make denoinstall
make denodelete 
```

# Scripts
  `deno task <script_name>`
  * cache: cache dependecies and write lock file
  * dev: run program in watch mode
  * run: run program once
  * bench: run program with benchmarking tool
  * test: run test with coverage output
  * compile: compiles proyect into binary; output name -> por_pol_api