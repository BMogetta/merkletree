denoinstall:
	curl -fsSL https://deno.land/x/install/install.sh | sudo DENO_INSTALL=/usr/local sh

denodelete:
	sudo rm $(which deno)

.PHONY: denoinstall denodelete 