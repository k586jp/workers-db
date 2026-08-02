import { WorkerEntrypoint } from 'cloudflare:workers'

type Env = {
    SAKURA_BEARER_TOKEN: string
};

export type Article = {
    id: string,
    public: boolean,
    title: string,
    text: string,
    created_at: string,
    updated_at: string
};

export class K586ArticleId extends WorkerEntrypoint<Env> {

    async getArticle(articleId: string) {
        const response = await fetch('https://api.k586.jp/article/id.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.env.SAKURA_BEARER_TOKEN}`
            },
            body: JSON.stringify({ id: articleId })
        });

        if (!response.ok) {
            throw new Error(`REST API Error: ${response.status}`);
        }

        const data: Article[] = await response.json();
        return data;
    }

}
