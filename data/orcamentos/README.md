## Armazenamento de orçamentos

Os orçamentos são guardados na VM como ficheiros JSON dentro desta pasta do projeto:

- `data/orcamentos/saved/`

Cada ficheiro corresponde a um orçamento e tem o seguinte formato de conteúdo:

- `id`: identificador único do orçamento (UUID).
- `createdAt` / `updatedAt`: datas ISO de criação/atualização.
- `items`: linhas do orçamento (artigos, quantidades, preços, etc.).
- `meta`: informação de cabeçalho (cliente, obra, datas, código interno, ...).

O nome atual dos ficheiros segue, em geral, este padrão:

- `TIMESTAMP-codigo-interno-normalizado-ID.json`
  - Exemplo: `2026-03-04T10-19-08-964Z-20260304-096-t2-na-peida-ee8c98d0-98b0-4d14-8c2e-ccbe63128355.json`

No futuro, esta pasta poderá conter subpastas por ano/mês (por exemplo `saved/2026/03/`), mas **todo o conteúdo continuará a viver dentro de `data/orcamentos/`**.

