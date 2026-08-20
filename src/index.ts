import {WorkerEntrypoint} from 'cloudflare:workers';
import {Md2HtmlService} from '../../workers-markdown2html/src/index';

const ARTICLES_LIMIT = 30;

type Env = {
    DB: D1Database,
    MD2HTML: Service<Md2HtmlService>,
    SAKURA_BEARER_TOKEN: string
};

export type Article = {
    id: string,
    is_public?: boolean,
    title: string,
    content_md: string,
    content_html?: string | null,
    user_id: string,
    created_at?: string,
    updated_at?: string
};


export class K586Articles extends WorkerEntrypoint<Env> {

    async getArticles(articleId?: string, page?: number) {
        // 取得
        let rows: D1Result<Article>;
        if (articleId) {
            const query =
                'SELECT t.id, t.title, t.content_md, t.content_html, t.user_id, strftime(\'%Y-%m-%dT%H:%MZ\', t.created_at) as created_at, strftime(\'%Y-%m-%dT%H:%MZ\', t.updated_at) as updated_at ' +
                'FROM article as t ' +
                'WHERE t.id = ? AND t.is_public = ?';
            const stmt = this.env.DB.prepare(query);
            rows = await stmt.bind(articleId, true).all<Article>();
        } else {
            const query =
                'SELECT t.id, t.title, t.content_md, t.content_html, t.user_id, strftime(\'%Y-%m-%dT%H:%MZ\', t.created_at) as created_at, strftime(\'%Y-%m-%dT%H:%MZ\', t.updated_at) as updated_at ' +
                'FROM article as t ' +
                'WHERE t.is_public = ? ' +
                'ORDER BY t.created_at DESC ' +
                'LIMIT ? OFFSET ?';
            const p = page || 0;
            const stmt = this.env.DB.prepare(query);
            rows = await stmt.bind(true, ARTICLES_LIMIT, (p * ARTICLES_LIMIT)).all<Article>();
        }
        const articles: Article[] = rows.results || null;

        // Markdown を HTML に変換
        const count = articles.length;
        let convertNumber: number[] = [];
        let convertPromises: Promise<string>[] = [];
        for (let i = 0; i < count; i++) {
            if (articles[i].content_html === null) {
                convertNumber.push(i);
                convertPromises.push(this.env.MD2HTML.convert(articles[i].content_md));
            }
        }
        const convert = await Promise.all(convertPromises);
        const convertCount = convertNumber.length;
        let stmtArray: D1PreparedStatement[] = [];
        for (let j = 0; j < convertCount; j++) {
            const i = convertNumber[j];
            articles[i].content_html = convert[j];
            const query =
                'UPDATE article ' +
                'SET content_html = ? ' +
                'WHERE id = ?';
            stmtArray.push(this.env.DB.prepare(query).bind(articles[i].content_html, articles[i].id));
        }
        if (stmtArray.length > 0) {
            await this.env.DB.batch(stmtArray);
        }
        return articles;
    }

    async getArticlesTitle () {
        const query =
            'SELECT t.id, t.title, t.user_id, strftime(\'%Y-%m-%dT%H:%MZ\', t.created_at) as created_at ' +
            'FROM article as t ' +
            'WHERE t.is_public = ? ' +
            'ORDER BY t.created_at DESC ' +
            'LIMIT ?';
        const stmt = this.env.DB.prepare(query);
        const rows = await stmt.bind(true, ARTICLES_LIMIT).all<Article>();
        const articles: Article[] = rows.results || null;

        return articles;
    }

    async getArticleEditMode (articleId: string) {
        const query =
            'SELECT t.id, t.title, t.content_md, t.user_id ' +
            'FROM article as t ' +
            'WHERE t.id = ?'; // 今のところ個人用なので is_public は見ない
        const stmt = this.env.DB.prepare(query);
        return await stmt.bind(articleId).first<Article>() || null;
    }

    async updateArticle (article: Article) {
        article.content_html = null;
        const query =
            'UPDATE article ' +
            'SET title = ?, content_md = ?, content_html = ? ' +
            'WHERE id = ?';
        const stmt = this.env.DB.prepare(query);
        let retry = 0;
        let result: D1Result<Record<string, unknown>> = null;
        while (result === null || !result.success) {
            if (retry > 5) {
                throw new Error('記事の保存に失敗しました。');
            }
            await sleep(5 * retry);
            result = await stmt.bind(article.title, article.content_md, article.content_html, article.id).run();
            retry++;
        }
    }

    async insertArticle (article: Article) {
        const query =
            'INSERT INTO article ' +
            '(id, is_public, title, content_md, user_id) ' +
            'VALUES (?, ?, ?, ?, ?)';
        const stmt = this.env.DB.prepare(query);
        let retry = 0;
        let result: D1Result<Record<string, unknown>> = null;
        while (result === null || !result.success) {
            if (retry > 5) {
                throw new Error('記事の保存に失敗しました。');
            }
            await sleep(5 * retry);
            result = await stmt.bind(article.id, true, article.title, article.content_md, 'k586').run();
            retry++;
        }
    }

}

export default {
    async fetch() {
        return new Response('RPC Service Only', { status: 400 });
    }
}


function sleep(seconds: number): Promise<void> {
    return new Promise(
        function (resolve) {
            setTimeout(resolve, seconds * 1000);
        }
    );
}


// export class K586ArticleId extends WorkerEntrypoint<Env> {
//
//     async getArticle(articleId: string) {
//         const response = await fetch('https://api.k586.jp/article/id.php', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${this.env.SAKURA_BEARER_TOKEN}`
//             },
//             body: JSON.stringify({ id: articleId })
//         });
//
//         if (!response.ok) {
//             throw new Error(`REST API Error: ${response.status}`);
//         }
//
//         const data: Article[] = await response.json();
//         return data;
//     }
//
// }
